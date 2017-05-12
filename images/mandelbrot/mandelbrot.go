// Render a frame of a Mandelbrot
// suitable for joining into a zoom movie.
// Public domain

package main

import (
	"flag"
	"image"
	"image/color"
	"image/jpeg"
	"log"
	"math"
	"os"
	"strconv"
	"strings"
)

var (
	center     string
	outfile    string
	parallel   int
	resolution string
	step       int
	zoom       float64
)

func init() {
	flag.StringVar(&center, "center", "-1,0", `The coordinates of the center of the image`)
	flag.StringVar(&outfile, "outfile", "out.jpg", "The name of the file to write the result to")
	flag.IntVar(&parallel, "parallel", 2, "The number of goroutines to render with")
	flag.StringVar(&resolution, "resolution", "1280,720", `The frame size`)
	flag.IntVar(&step, "step", 15, "The number of iterations to run to check for convergence")
	flag.Float64Var(&zoom, "zoom", 2, "The distance from the center along the width")
}

const (
	bailout = 50
)

func mandelbrot(c complex128, step int) (complex128, int, bool) {
	z := c
	i := -1
	for {
		i++
		escape := real(z)*real(z)+imag(z)*imag(z) > bailout
		if i >= step || escape {
			return z, i, escape
		}
		z = z*z + c
	}
}

var (
	ln2           = math.Log(2)
	bailoutOffset = math.Log(math.Log(bailout)/ln2) / ln2

	palette = []color.RGBA{
		{255, 188, 66, 0},
		{101, 66, 54, 0},
		{249, 127, 139, 0},
		{33, 131, 128, 0},
		{115, 210, 222, 0},
	}
)

func blend(a, b color.RGBA, alpha float64) color.RGBA {
	var c color.RGBA

	c.R = byte((1-alpha)*float64(a.R) + alpha*float64(b.R))
	c.G = byte((1-alpha)*float64(a.G) + alpha*float64(b.G))
	c.B = byte((1-alpha)*float64(a.B) + alpha*float64(b.B))
	c.A = byte((1-alpha)*float64(a.A) + alpha*float64(b.A))

	return c
}

func applyPalette(zp complex128, it int, escape bool) color.RGBA {
	var c color.RGBA
	if escape {
		d := real(zp)*real(zp) + imag(zp)*imag(zp)
		i2 := float64(it) + bailoutOffset - math.Log(math.Log(d)/ln2)/ln2
		i2 *= 0.1
		c1 := int(i2) % len(palette)
		c2 := (c1 + 1) % len(palette)
		a := math.Mod(i2, 1)
		c = blend(palette[c1], palette[c2], a)
	}

	return c
}

func render(center complex128, width, height, parallel, step int, zoom float64) image.Image {
	img := image.NewRGBA(image.Rectangle{image.Point{0, 0}, image.Point{width, height}})

	xstart := real(center) - zoom
	xstep := 2 * zoom / float64(width)
	aspect := float64(height) / float64(width)
	ystart := imag(center) - aspect*zoom
	ystep := 2 * aspect * zoom / float64(height)

	type workS struct {
		x int
		y int
		z complex128
	}

	quit := make(chan struct{})
	defer close(quit)
	done := make(chan struct{})
	work := make(chan workS)
	for i := 0; i < parallel; i++ {
		go func() {
			for {
				select {
				case <-quit:
					return

				case w := <-work:
					c := applyPalette(mandelbrot(w.z, step))
					img.SetRGBA(w.x, w.y, c)
					done <- struct{}{}
				}
			}
		}()
	}

	todo := 0
	for y := 0; y < height; y++ {
		y2 := ystart + float64(y)*ystep
		for x := 0; x < width; x++ {
			x2 := xstart + float64(x)*xstep
			z := complex(x2, y2)
			for {
				select {
				case work <- workS{x, y, z}:
				case <-done:
					todo--
					continue
				}
				break
			}
			todo++
		}
	}

	for todo > 0 {
		<-done
		todo--
	}

	return img
}

func main() {
	flag.Parse()

	c := strings.Split(center, ",")
	if len(c) != 2 {
		log.Fatalf("--center must have 2 parts separated by a comma, got %q", center)
	}

	re, err := strconv.ParseFloat(c[0], 64)
	if err != nil {
		log.Fatalf("--center real isn't a float: %v", err)
	}

	im, err := strconv.ParseFloat(c[1], 64)
	if err != nil {
		log.Fatalf("--center imaginary isn't a float: %v", err)
	}

	z := complex(re, im)

	res := strings.Split(resolution, ",")
	if len(res) != 2 {
		log.Fatalf("--resolution must have 2 parts separated by a comma, got %q", resolution)
	}

	width, err := strconv.ParseInt(res[0], 10, 64)
	if err != nil {
		log.Fatalf("--resolution width isn't an int: %v", err)
	}

	height, err := strconv.ParseInt(res[1], 10, 64)
	if err != nil {
		log.Fatalf("--resolution height isn't a int: %v", err)
	}

	if width < 1 {
		log.Fatalf("--resolution width must be positive, got %d", width)
	}
	if height < 1 {
		log.Fatalf("--resolution height must be positive, got %d", height)
	}

	img := render(z, int(width), int(height), parallel, step, zoom)
	f, err := os.Create(outfile)
	if err != nil {
		log.Fatalf("Can't open %q: %v", outfile, err)
	}
	defer f.Close()
	jpeg.Encode(f, img, &jpeg.Options{Quality: 95})
}
